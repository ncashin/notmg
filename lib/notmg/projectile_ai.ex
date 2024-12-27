defmodule Notmg.ProjectileAI do
  use GenServer
  require Logger
  alias Notmg.Projectile
  alias Notmg.Room

  @update_rate 100
  @speed 500

  def start_link(projectile_id, initial_state, room_id) do
    GenServer.start_link(__MODULE__, {projectile_id, initial_state, room_id},
      name: via_tuple(projectile_id)
    )
  end

  def stop(projectile_id) do
    GenServer.stop(via_tuple(projectile_id))
  end

  @impl true
  def init({_projectile_id, projectile_state, room_id}) do
    :timer.send_interval(@update_rate, :tick)
    {:ok, %{projectile: projectile_state, room_id: room_id}}
  end

  @impl true
  def handle_info(:tick, state) do
    delta_time = @update_rate / 1000

    projectile = state.projectile

    velocity_x = :math.cos(projectile.radians) * @speed
    velocity_y = :math.sin(projectile.radians) * @speed

    projectile = %Projectile{
      projectile
      | x: projectile.x + velocity_x * delta_time,
        y: projectile.y + velocity_y * delta_time
    }

    Room.update_entity(state.room_id, projectile)

    {_id, colliding_entity} =
      Room.get_state(state.room_id).entities
      |> Enum.find({nil, nil}, fn {_id, entity} ->
        entity.type != :projectile && Room.circle_collision?(projectile, entity)
      end)

    if colliding_entity != nil do
      Room.update_entity(state.room_id, %{colliding_entity | health: colliding_entity.health - 5})
    end

    {:noreply, %{state | projectile: projectile}}
  end

  defp via_tuple(projectile_id) do
    {:via, Registry, {Notmg.EntityRegistry, projectile_id}}
  end
end
