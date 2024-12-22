defmodule Notmg.Enemy do
  alias Notmg.Entity

  @derive Jason.Encoder
  defstruct [:id, :ai_pid, type: nil, max_health: 50, health: 50] ++ Map.keys(%Entity{})
end
