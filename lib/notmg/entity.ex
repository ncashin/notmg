defmodule Notmg.Entity do
  @derive Jason.Encoder
  defstruct [
    :id,
    :type,
    :update_fn,
    :interact_fn,
    :inventory,
    x: 0,
    y: 0,
    radius: 0,
    collision_mask: 0
  ]
  @collision_mask_player 0b0001
  @collision_mask_enemy 0b0010
  @collision_mask_player_interactable 0b0100

  def generate_id() do
    :crypto.strong_rand_bytes(16) |> Base.encode64()
  end

  def circle_collision?(obj1, obj2) do
    distance = :math.sqrt(:math.pow(obj1.x - obj2.x, 2) + :math.pow(obj1.y - obj2.y, 2))

    Bitwise.band(obj1.collision_mask, obj2.collision_mask) > 0 &&
      distance < obj1.radius + obj2.radius
  end

  def create_entity(entity_type, x, y) do
    IO.inspect(entity_type)
    entity_id = Notmg.Entity.generate_id()
    entity_map = %{
      :leviathan => %Notmg.Enemy{
        id: entity_id,
        type: :leviathan,
        update_fn: &Notmg.Enemy.update/3,
        interact_fn: nil,
        inventory: nil,
        max_health: 50,
        health: 50,
        x: x,
        y: y,
        radius: 48,
        collision_mask: @collision_mask_enemy,
        speed: 150,
        last_think_time: 0
      },
      :button => %{
        id: entity_id,
        type: :button,
        update_fn: nil,
        interact_fn: fn state, _interacting_entity, interactable ->
          enemy = Notmg.Entity.create_entity(:leviathan, interactable.x, interactable.y)
          put_in(state.entities[enemy.id], enemy)
        end,
        inventory: nil,
        x: x,
        y: y,
        radius: 400,
        health: 0,
        max_health: 1,
        collision_mask: @collision_mask_player_interactable
      }
    }

    entity_map[entity_type]
  end
end
