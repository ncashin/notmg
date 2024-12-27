defmodule Notmg.Enemy do
  alias Notmg.Entity

  @derive Jason.Encoder
  defstruct ([:ai_pid, ai_entity: true, max_health: 50, health: 50, speed: 500] ++
               Map.keys(%Entity{}))
            |> Enum.reject(&(&1 == :__struct__))

  def update(state, delta_time, entity) do
    angle = :rand.uniform() * 2 * :math.pi()

    velocity_x = :math.cos(angle) * entity.speed
    velocity_y = :math.sin(angle) * entity.speed

    new_x = entity.x + velocity_x * delta_time
    new_y = entity.y + velocity_y * delta_time

    enemy = %{entity | x: new_x, y: new_y}

    if enemy.health <= 0 do
      put_in(state.entities, state.entities |> Map.delete(entity.id))
    else
      put_in(state.entities[entity.id], enemy)
    end
  end
end
