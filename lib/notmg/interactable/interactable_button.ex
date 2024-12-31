defmodule Notmg.Interactable.Button do
  def interact(state, interacting_entity, interactable) do
    trigger = state.entities[interactable.triggers]

    state = trigger.trigger_fn.(state, trigger, trigger)

    update_in(state.events, fn existing_events ->
      existing_events ++ [
        %Notmg.Event{
          type: :button_pressed,
          data: %{
            button_id: interactable.id,
            interacting_entity_id: interacting_entity.id,
            x: interacting_entity.x,
            y: interacting_entity.y
          }
        }
      ]
    end)
  end
end
