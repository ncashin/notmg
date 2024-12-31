defmodule Notmg.Maps do
  alias Notmg.Entity

  defp ldtk_path do
    Path.join(:code.priv_dir(:notmg), "static/assets/map.ldtk")
  end

  @map_scale 2.5
  defmodule MapEntity do
    @derive Jason.Encoder
    defstruct editor_iid: nil, name: nil, world_x: nil, world_y: nil, fields: %{}
  end

  defmodule MapInstance do
    @derive Jason.Encoder
    defstruct name: nil,
              width: nil,
              height: nil,
              world_x: nil,
              world_y: nil,
              layer_names: [],
              entities: []
  end

  def load_maps(path) do
    path
    |> File.read!()
    |> Ldtk.Root.from_json()
    |> ldtk_root_to_maps()
  end

  def load_maps() do
    load_maps(ldtk_path())
  end

  def ldtk_root_to_maps(ldtk_root) do
    for level <- ldtk_root.levels do
      entities =
        case Enum.find(level.layer_instances, &(&1.identifier == "entities")) do
          nil ->
            []

          entity_layer ->
            for entity <- entity_layer.entity_instances do
              %MapEntity{
                editor_iid: entity.iid,
                name: entity.identifier |> String.to_atom(),
                world_x: entity.world_x * @map_scale,
                world_y: entity.world_y * @map_scale,
                fields:
                  Map.new(entity.field_instances, fn field ->
                    key = String.to_atom(field.identifier)

                    case field.type do
                      "EntityRef" ->
                        value = field.value["entityIid"]
                        {key, {:entity_ref, value}}

                      _ ->
                        key = String.to_atom(field.identifier)

                        value =
                          case key do
                            :radius -> field.value * @map_scale
                            _ -> field.value
                          end

                        {key, value}
                    end
                  end)
              }
            end
        end

      %MapInstance{
        name: level.identifier,
        width: level.px_wid * @map_scale,
        height: level.px_hei * @map_scale,
        world_x: level.world_x * @map_scale,
        world_y: level.world_y * @map_scale,
        layer_names: Enum.map(level.layer_instances, & &1.identifier),
        entities: entities
      }
    end
  end

  def get_map(maps, room_id) do
    map = maps |> Enum.find(&(&1.name == room_id))

    {
      map,
      map_entities_to_actual_entities(map)
    }
  end

  def map_entities_to_actual_entities(map) do
    entities_by_editor_iid =
      map.entities
      |> Enum.filter(fn entity -> entity.name != :spawn_point end)
      |> Enum.map(fn entity ->
        fields = Map.put(entity.fields, :editor_iid, entity.editor_iid)
        fields = Enum.map(fields, fn {k, v} -> {k, v} end)

        created_entity =
          Entity.create_entity(
            entity.fields.type |> String.to_atom(),
            entity.world_x,
            entity.world_y,
            fields
          )

        {entity.editor_iid, created_entity}
      end)
      |> Map.new()

    entities_by_editor_iid
    |> Map.values()
    |> Enum.map(fn entity ->
      updated_entity =
        Map.new(entity |> Map.from_struct(), fn {key, value} ->
          case value do
            {:entity_ref, editor_iid} ->
              referenced_entity = Map.get(entities_by_editor_iid, editor_iid)
              {key, referenced_entity.id}

            other ->
              {key, other}
          end
        end)
        |> then(fn map ->
          struct(entity.__struct__, map)
        end)

      {updated_entity.id, updated_entity}
    end)
    |> Map.new()
  end
end
