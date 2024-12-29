defmodule Notmg.Inventory do
  @derive Jason.Encoder
  defstruct slots: [], items: %{}, equipped_items: %{}

  defmodule Collider do
    @derive Jason.Encoder
    defstruct offset_x: 0, offset_y: 0, width: 0, height: 0
  end

  defmodule Item do
    @derive Jason.Encoder
    defstruct [:id, :type, x: 0, y: 0, colliders: []]
  end

  defmodule Slot do
    @derive Jason.Encoder
    defstruct [:type, x: 0, y: 0, width: 0, height: 0]
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
    other_item_id = Notmg.Entity.generate_id()

    items = %{
      item_id => %Item{id: item_id, type: :weapon, x: 0, y: 0, colliders: colliders},
      other_item_id => %Item{id: other_item_id, type: :weapon, x: 5, y: 0, colliders: colliders}
    }

    slots = [
      %Slot{type: :none, x: 0, y: 0, width: 10, height: 5},
      %Slot{type: :weapon, x: 12, y: 0, width: 2, height: 3}
    ]

    %{inventory | slots: slots, items: items}
  end

  def inventory_slot_check(inventory, x, y) do
    Enum.reduce_while(inventory.slots, false, fn slot, _slot_exists ->
      overlap_x = slot.x <= x and x < slot.x + slot.width
      overlap_y = slot.y <= y and y < slot.y + slot.height

      if overlap_x and overlap_y do
        {:halt, slot.type}
      else
        {:cont, nil}
      end
    end)
  end

  def inventory_item_check(inventory, item, x, y) do
    slot_type =
      Enum.reduce_while(item.colliders, item.type, fn collider, acc ->
        slot = check_slots(inventory, x, y, collider, item.type)
        slot_type = if slot == acc, do: acc, else: :none

        if slot != nil do
          {:cont, slot_type}
        else
          {:halt, nil}
        end
      end)

    if Enum.reduce_while(item.colliders, true, fn collider, _ ->
         cx = x + collider.offset_x
         cy = y + collider.offset_y

         if !Enum.reduce_while(inventory.items, true, fn {_id, iter_item}, _ ->
              if item.id != iter_item.id ||
                   Enum.reduce_while(iter_item.colliders, true, fn other_collider, _ ->
                     ocx = item.x + other_collider.offset_x
                     ocy = item.y + other_collider.offset_y

                     noXOverlap =
                       ocx + other_collider.width - 1 < cx || ocx > cx + collider.width - 1

                     noYOverlap =
                       ocy + other_collider.height - 1 < cy || ocy > cy + collider.height - 1

                     if noXOverlap || noYOverlap do
                       {:cont, true}
                     else
                       {:halt, false}
                     end
                   end) do
                {:cont, true}
              else
                {:cont, true}
              end
            end) do
           {:cont, true}
         else
           {:halt, false}
         end
       end) do
      nil
    else
      slot_type
    end
  end

  defp check_slots(inventory, x, y, collider, type) do
    0..(collider.width - 1)
    |> Enum.to_list()
    |> Enum.reduce_while(type, fn dx, type ->
      slot =
        0..(collider.height - 1)
        |> Enum.to_list()
        |> Enum.reduce_while(type, fn dy, type ->
          slot =
            inventory_slot_check(
              inventory,
              x + collider.offset_x + dx,
              y + collider.offset_y + dy
            )

          slot_type = if slot == type, do: type, else: :none
          if slot != nil, do: {:cont, slot_type}, else: {:halt, nil}
        end)

      slot_type = if slot == type, do: type, else: :none
      if slot != nil, do: {:cont, slot_type}, else: {:halt, nil}
    end)
  end

  def new do
    %__MODULE__{slots: [], items: []}
  end
end
