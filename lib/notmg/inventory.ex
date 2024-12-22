defmodule Notmg.Inventory do
  @derive Jason.Encoder
  defstruct slots: [], items: []

  defmodule Collider do
    @derive Jason.Encoder
    defstruct offset_x: 0, offset_y: 0, width: 0, height: 0
  end

  defmodule Item do
    @derive Jason.Encoder
    defstruct x: 0, y: 0, colliders: []
  end

  defmodule Slot do
    @derive Jason.Encoder
    defstruct x: 0, y: 0, width: 0, height: 0
  end

  def populate_with_test_data(inventory) do
    colliders = [
      %Collider{offset_x: 0, offset_y: 0, width: 1, height: 2},
      %Collider{offset_x: 1, offset_y: 0, width: 1, height: 1}
    ]

    items = [
      %Item{x: 0, y: 0, colliders: colliders}
    ]

    slots = [
      %Slot{x: 0, y: 0, width: 10, height: 5}
    ]

    %{inventory | slots: slots, items: items}
  end

  def new do
    %__MODULE__{slots: [], items: []}
  end
end
