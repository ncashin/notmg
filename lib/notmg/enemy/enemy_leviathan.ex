defmodule Notmg.Enemy.Leviathan do
  alias Notmg.Entity

  def update(state, delta_time, entity) do
    current_time = System.system_time(:millisecond)

    nearest_player = find_nearest_player(state.entities, entity)

    {new_state, new_entity} =
      case nearest_player do
        nil ->
          handle_roaming(state, current_time, delta_time, entity)

        player ->
          distance = Entity.calculate_distance(entity, player)

          if distance <= entity.attack_range do
            handle_attacking(state, current_time, entity, player)
          else
            handle_roaming(state, current_time, delta_time, entity)
          end
      end

    if new_entity.health <= 0 do
      state = put_in(new_state.entities, new_state.entities |> Map.delete(entity.id))

      update_in(state.events, fn existing_events ->
        existing_events ++
          [
            %Notmg.Event{
              type: :enemy_died,
              data: %{enemy_id: entity.id, x: entity.x, y: entity.y}
            }
          ]
      end)
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
      if current_time >= entity.time_since_last_attack do
        projectile_x = entity.x + :math.cos(angle) * entity.radius
        projectile_y = entity.y + :math.sin(angle) * entity.radius

        projectile =
          Entity.create_entity(
            :projectile,
            projectile_x,
            projectile_y,
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
        time_since_last_attack:
          if(current_time >= entity.time_since_last_attack,
            do: current_time + entity.attack_cooldown,
            else: entity.time_since_last_attack
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
