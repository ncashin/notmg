defmodule Notmg.Enemy do
  alias Notmg.Entity

  @derive Jason.Encoder
  defstruct ([
               :ai_pid,
               :angle,
               ai_entity: true,
               max_health: 50,
               health: 50,
               speed: 150,
               projectile_speed: 300,
               last_think_time: 0,
               attack_cooldown: 0
             ] ++
               Map.keys(%Entity{}))
            |> Enum.reject(&(&1 == :__struct__))

  @attack_range 400
  @attack_cooldown 1000

  def update(state, delta_time, entity) do
    current_time = System.system_time(:millisecond)

    nearest_player = find_nearest_player(state.entities, entity)

    {new_state, new_entity} =
      case nearest_player do
        nil ->
          handle_roaming(state, current_time, delta_time, entity)

        player ->
          distance = Entity.calculate_distance(entity, player)

          if distance <= @attack_range do
            handle_attacking(state, current_time, entity, player)
          else
            handle_roaming(state, current_time, delta_time, entity)
          end
      end

    if new_entity.health <= 0 do
      put_in(new_state.entities, new_state.entities |> Map.delete(entity.id))
    else
      put_in(new_state.entities[entity.id], new_entity)
    end
  end

  defp handle_roaming(state, current_time, delta_time, entity) do
    {angle, new_last_think_time} =
      if current_time - entity.last_think_time >= 1000 do
        {
          :rand.uniform() * 2 * :math.pi(),
          current_time
        }
      else
        {entity.angle || 0, entity.last_think_time}
      end

    velocity_x = :math.cos(angle) * entity.speed
    velocity_y = :math.sin(angle) * entity.speed

    new_x = entity.x + velocity_x * delta_time
    new_y = entity.y + velocity_y * delta_time

    new_entity = %{
      entity
      | x: new_x,
        y: new_y,
        angle: angle,
        last_think_time: new_last_think_time
    }

    {state, new_entity}
  end

  defp handle_attacking(state, current_time, entity, player) do
    angle = :math.atan2(player.y - entity.y, player.x - entity.x)

    state_with_projectile =
      if current_time >= entity.attack_cooldown do
        projectile =
          Entity.create_entity(:projectile, entity.x, entity.y,
            collision_mask: Entity.collision_mask_player(),
            radians: angle,
            radius: 16,
            speed: entity.projectile_speed
          )

        put_in(state.entities[projectile.id], projectile)
      else
        state
      end

    new_entity = %{
      entity
      | angle: angle,
        attack_cooldown:
          if(current_time >= entity.attack_cooldown,
            do: current_time + @attack_cooldown,
            else: entity.attack_cooldown
          )
    }

    {state_with_projectile, new_entity}
  end

  defp find_nearest_player(entities, enemy) do
    entities
    |> Enum.filter(fn {_id, entity} -> entity.type == :player end)
    |> Enum.min_by(
      fn {_id, player} ->
        Entity.calculate_distance(enemy, player)
      end,
      fn -> nil end
    )
    |> case do
      {_id, player} -> player
      nil -> nil
    end
  end
end
