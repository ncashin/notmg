defmodule Notmg.Player do
  alias Notmg.{Entity, Inventory}

  @derive Jason.Encoder
  defstruct ([ai_entity: false, max_health: 100, health: 100, inventory: %Inventory{}] ++
               Map.keys(%Entity{}))
            |> Enum.reject(&(&1 == :__struct__))
end
