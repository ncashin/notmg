defmodule Notmg.Entity do
  alias Notmg.{Projectile, Enemy}

  @derive Jason.Encoder
  defstruct [
    :id,
    :type,
    :update_fn,
    :interact_fn,
    :inventory,
    :x,
    :y,
    :radius,
    :collision_mask
  ]

  @collision_mask_player 0b0001
  @collision_mask_enemy 0b0010
  @collision_mask_player_interactable 0b0100

  def collision_mask_player, do: @collision_mask_player
  def collision_mask_enemy, do: @collision_mask_enemy
  def collision_mask_player_interactable, do: @collision_mask_player_interactable

  def generate_id() do
    :crypto.strong_rand_bytes(16) |> Base.encode64()
  end

  def calculate_distance(obj1, obj2) do
    :math.sqrt(:math.pow(obj1.x - obj2.x, 2) + :math.pow(obj1.y - obj2.y, 2))
  end

  def circle_collision?(obj1, obj2) do
    Bitwise.band(obj1.collision_mask, obj2.collision_mask) > 0 &&
      calculate_distance(obj1, obj2) < obj1.radius + obj2.radius
  end

  def create_entity(type, x, y, opts \\ [])

  def create_entity(:projectile, x, y, opts) do
    %Projectile{
      id: generate_id(),
      type: :projectile,
      update_fn: &Projectile.update/3,
      collision_mask: Keyword.fetch!(opts, :collision_mask),
      x: x,
      y: y,
      radius: Keyword.fetch!(opts, :radius),
      radians: Keyword.fetch!(opts, :radians),
      speed: Keyword.fetch!(opts, :speed)
    }
  end

  def create_entity(:leviathan, x, y, opts) do
    %Enemy{
      id: generate_id(),
      type: :leviathan,
      update_fn: &Enemy.update/3,
      interact_fn: nil,
      inventory: nil,
      max_health: Keyword.get(opts, :max_health, 50),
      health: Keyword.get(opts, :health, 50),
      x: x,
      y: y,
      radius: Keyword.get(opts, :radius, 48),
      collision_mask: Keyword.get(opts, :collision_mask, @collision_mask_enemy),
      speed: Keyword.get(opts, :speed, 150),
      last_think_time: 0
    }
  end

  def create_entity(:button, x, y, opts) do
    %{
      id: generate_id(),
      type: :button,
      update_fn: nil,
      interact_fn: fn state, _interacting_entity, interactable ->
        enemy = create_entity(:leviathan, interactable.x, interactable.y)
        put_in(state.entities[enemy.id], enemy)
      end,
      inventory: nil,
      x: x,
      y: y,
      radius: Keyword.get(opts, :radius, 400),
      health: 0,
      max_health: 1,
      collision_mask: @collision_mask_player_interactable
    }
  end
end
