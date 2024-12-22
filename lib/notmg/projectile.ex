defmodule Notmg.Projectile do
  @entity_fields [:x, :y, :radius, :velocity_x, :velocity_y]

  @derive Jason.Encoder
  defstruct [:id, creation_time: nil] ++ @entity_fields
end
