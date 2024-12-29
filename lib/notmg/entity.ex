defmodule Notmg.Entity do
  @derive Jason.Encoder
  defstruct [:id, :type, :update_fn, :interact_fn, :inventory, x: 0, y: 0, radius: 0, collision_mask: 0]

  def generate_id() do
    :crypto.strong_rand_bytes(16) |> Base.encode64()
  end

  def circle_collision?(obj1, obj2) do
    distance = :math.sqrt(:math.pow(obj1.x - obj2.x, 2) + :math.pow(obj1.y - obj2.y, 2))

    Bitwise.band(obj1.collision_mask, obj2.collision_mask) > 0 &&
      distance < obj1.radius + obj2.radius
  end
end
