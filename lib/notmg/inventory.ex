defmodule Notmg.Inventory do
  @derive Jason.Encoder
  defstruct slots: [], items: []

  defmodule Collider do
    @derive Jason.Encoder
    defstruct offset_x: 0, offset_y: 0, width: 0, height: 0
  end

  defmodule Item do
    @derive Jason.Encoder
    defstruct [:id, x: 0, y: 0, colliders: []]
  end

  defmodule Slot do
    @derive Jason.Encoder
    defstruct x: 0, y: 0, width: 0, height: 0
  end

  @spec populate_with_test_data(%{:items => any(), :slots => any(), optional(any()) => any()}) ::
          %{
            :items => %{optional(binary()) => %Notmg.Inventory.Item{colliders: [...], x: 0, y: 0}},
            :slots => [%Notmg.Inventory.Slot{height: 5, width: 10, x: 0, y: 0}, ...],
            optional(any()) => any()
          }
  def populate_with_test_data(inventory) do
    colliders = [
      %Collider{offset_x: 0, offset_y: 0, width: 1, height: 2},
      %Collider{offset_x: 1, offset_y: 0, width: 1, height: 1}
    ]

    item_id = Notmg.Entity.generate_id()
    items = %{
      item_id => %Item{id: item_id, x: 0, y: 0, colliders: colliders}
    }

    slots = [
      %Slot{x: 0, y: 0, width: 10, height: 5}
    ]

    %{inventory | slots: slots, items: items}
  end

  def new do
    %__MODULE__{slots: [], items: []}
  end
end
