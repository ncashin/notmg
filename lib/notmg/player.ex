defmodule Notmg.Player do
  @entity_fields [:x, :y, :radius, :velocity_x, :velocity_y]

  @derive Jason.Encoder
  defstruct [:id, max_health: 100, health: 100] ++ @entity_fields
end
