defmodule Notmg.EnemyAI do
  use GenServer
  alias Notmg.Enemy
  alias Notmg.Room

  @thinking_rate 1000
  @update_rate 100
  @speed 100
  @bounds %{x_min: -10000, x_max: 10000, y_min: -10000, y_max: 10000}

  def start_link(enemy_id, initial_state, room_id) do
    GenServer.start_link(__MODULE__, {enemy_id, initial_state, room_id},
      name: via_tuple(enemy_id)
    )
  end

  def stop(enemy_id) do
    GenServer.stop(via_tuple(enemy_id))
  end

  @impl true
  def init({_enemy_id, enemy_state, room_id}) do
    :timer.send_interval(@update_rate, :tick)
    :timer.send_interval(@thinking_rate, :thinking)
    {:ok, %{enemy: enemy_state, room_id: room_id, angle: 0}}
  end

  def think(state) do
    angle = :rand.uniform() * 2 * :math.pi()

    state |> Map.put(:angle, angle)
  end

  @impl true
  def handle_info(:thinking, state) do
    {:noreply, think(state)}
  end

  @impl true
  def handle_info(:tick, state) do
    velocity_x = :math.cos(state.angle) * @speed
    velocity_y = :math.sin(state.angle) * @speed

    enemy = state.enemy

    delta_time = @update_rate / 1000
    new_x = enemy.x + velocity_x * delta_time
    new_y = enemy.y + velocity_y * delta_time

    new_x = max(min(new_x, @bounds.x_max), @bounds.x_min)
    new_y = max(min(new_y, @bounds.y_max), @bounds.y_min)

    enemy = %Enemy{enemy | x: new_x, y: new_y}

    Room.update_enemy(state.room_id, enemy)

    {:noreply, %{state | enemy: enemy}}
  end

  defp via_tuple(enemy_id) do
    {:via, Registry, {Notmg.EnemyRegistry, enemy_id}}
  end
end
