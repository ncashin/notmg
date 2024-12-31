defmodule Notmg.Spawner.Enemy do
  alias Notmg.Entity

  def trigger(state, _triggering_entity, trigger) do
    enemy = Entity.create_entity(trigger.enemy, trigger.x, trigger.y)
    state = put_in(state.entities[enemy.id], enemy)

    update_in(state.events, fn existing_events ->
      existing_events ++ [
        %Notmg.Event{
          type: :enemy_spawned,
          data: %{enemy_id: enemy.id, x: enemy.x, y: enemy.y}
        }
      ]
    end)
  end
end
