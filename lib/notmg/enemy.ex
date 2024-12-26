defmodule Notmg.Enemy do
  alias Notmg.Entity

  @derive Jason.Encoder
  defstruct ([:ai_pid, ai_entity: true, max_health: 50, health: 50] ++
               Map.keys(%Entity{}))
            |> Enum.reject(&(&1 == :__struct__))
end
