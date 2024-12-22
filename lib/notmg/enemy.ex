defmodule Notmg.Enemy do
  @entity_fields [:x, :y, :radius, :velocity_x, :velocity_y]

  @derive Jason.Encoder
  defstruct [:id, :ai_pid, type: nil, max_health: 50, health: 50] ++ @entity_fields
end
