defmodule Notmg.Player do
  alias Notmg.{Entity, Inventory}

  defmodule ChatMessage do
    @derive Jason.Encoder
    defstruct [:content, :sent_at]

    def new(content) do
      %ChatMessage{
        content: content,
        sent_at: System.system_time(:millisecond)
      }
    end
  end

  @derive Jason.Encoder
  defstruct ([
               ai_entity: false,
               max_health: 100,
               health: 100,
               inventory: %Inventory{},
               chat_messages: [],
               wip_message: ""
             ] ++
               Map.keys(%Entity{}))
            |> Enum.reject(&(&1 == :__struct__))
end
