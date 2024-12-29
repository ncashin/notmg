defmodule Notmg.Enemy do
  alias Notmg.Entity

  @derive Jason.Encoder
  defstruct ([:ai_pid, :last_think_time, :angle, ai_entity: true, max_health: 50, health: 50, speed: 150] ++
               Map.keys(%Entity{}))
            |> Enum.reject(&(&1 == :__struct__))

  def update(state, delta_time, entity) do
    current_time = System.system_time(:millisecond)
    last_think_time = entity.last_think_time || 0

    {angle, last_think_time} = if current_time - last_think_time >= 1000 do
      {
        :rand.uniform() * 2 * :math.pi(),
        current_time
      }
    else
      {entity.angle || 0, last_think_time}
    end

    velocity_x = :math.cos(angle) * entity.speed
    velocity_y = :math.sin(angle) * entity.speed

    new_x = entity.x + velocity_x * delta_time
    new_y = entity.y + velocity_y * delta_time

    enemy = %{entity |
      x: new_x,
      y: new_y,
      angle: angle,
      last_think_time: last_think_time
    }

    if enemy.health <= 0 do
      put_in(state.entities, state.entities |> Map.delete(entity.id))
    else
      put_in(state.entities[entity.id], enemy)
    end
  end
end
