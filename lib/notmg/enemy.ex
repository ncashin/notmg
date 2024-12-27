defmodule Notmg.Enemy do
  alias Notmg.Entity

  @derive Jason.Encoder
  defstruct ([:max_health, :health] ++
               Map.keys(%Entity{}))
            |> Enum.reject(&(&1 == :__struct__))
end
