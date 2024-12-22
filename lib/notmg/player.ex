defmodule Notmg.Player do
  alias Notmg.{Entity, Inventory}

  @derive Jason.Encoder
  defstruct [:id, max_health: 100, health: 100, inventory: %Inventory{}] ++ Map.keys(%Entity{})
end
