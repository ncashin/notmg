defmodule Notmg.Projectile do
  alias Notmg.Entity

  @derive Jason.Encoder
  defstruct ([:radians, :speed, :lifetime, creation_time: nil] ++
               Map.keys(%Entity{}))
            |> Enum.reject(&(&1 == :__struct__))

  def update(state, delta_time, entity) do
    velocity_x = :math.cos(entity.radians) * entity.speed
    velocity_y = :math.sin(entity.radians) * entity.speed

    projectile = %{
      entity
      | x: entity.x + velocity_x * delta_time,
        y: entity.y + velocity_y * delta_time
    }

    {_id, colliding_entity} =
      state.entities
      |> Enum.find({nil, nil}, fn {_id, entity} ->
        entity.type != :projectile && Entity.circle_collision?(entity, projectile)
      end)

    if colliding_entity != nil do
      state =
        put_in(state.entities[colliding_entity.id], %{
          colliding_entity
          | health: colliding_entity.health - 5
        })

      state = put_in(state.entities, state.entities |> Map.delete(projectile.id))

      angle = :math.atan2(colliding_entity.y - projectile.y, colliding_entity.x - projectile.x)
      collision_x = projectile.x + :math.cos(angle) * projectile.radius
      collision_y = projectile.y + :math.sin(angle) * projectile.radius

      put_in(state.events, [
        %Notmg.Event{type: :projectile_hit, data: %{
          projectile_id: projectile.id,
          colliding_entity_id: colliding_entity.id,
          x: collision_x,
          y: collision_y
        }}
      ])
    else
      if entity.lifetime < 0 do
        state = put_in(state.entities, state.entities |> Map.delete(projectile.id))

        put_in(state.events, [
          %Notmg.Event{type: :projectile_expired, data: %{projectile_id: projectile.id}}
        ])
      else
        put_in(
          state.entities[entity.id],
          projectile |> Map.put(:lifetime, projectile.lifetime - delta_time)
        )
      end
    end
  end
end
