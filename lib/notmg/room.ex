defmodule Notmg.Room do
  use GenServer
  alias Notmg.{Maps, Player, Enemy, Projectile, Entity, Inventory}
  alias NotmgWeb.Endpoint
  require Logger

  @tick_rate 32
  @enemy_spawn_rate 1000 * 3

  @collision_mask_player 1
  @collision_mask_enemy 2
  @collision_mask_player_interactable 4

  def tick_rate, do: @tick_rate

  def start_link(room_id) do
    GenServer.start_link(__MODULE__, room_id, name: via_tuple(room_id))
  end

  def join(room_id, player_id) do
    GenServer.call(via_tuple(room_id), {:join, player_id})
  end

  def update_player(room_id, player_id, payload) do
    GenServer.call(via_tuple(room_id), {:update_entity_player, player_id, payload})
  end

  def shoot(room_id, player_id, payload) do
    GenServer.call(via_tuple(room_id), {:shoot, player_id, payload})
  end

  def interact(room_id, player_id, payload) do
    GenServer.call(via_tuple(room_id), {:interact, player_id, payload})
  end

  def chat(room_id, player_id, payload) do
    GenServer.call(via_tuple(room_id), {:chat, player_id, payload})
  end

  def finalize_chat(room_id, player_id, payload) do
    GenServer.call(via_tuple(room_id), {:finalize_chat, player_id, payload})
  end

  def get_state(room_id) do
    GenServer.call(via_tuple(room_id), :get_state)
  end

  def create_enemy(x, y) do
    enemy_id = Entity.generate_id()

    %Enemy{
      id: enemy_id,
      type: :leviathan,
      update_fn: &Enemy.update/3,
      interact_fn: nil,
      max_health: 50,
      health: 50,
      x: x,
      y: y,
      radius: 48,
      collision_mask: 2,
      speed: 500
    }
  end

  @impl true
  def init(room_id) do
    Logger.info("Starting room #{room_id}")

    Endpoint.subscribe(room_key(room_id))

    :timer.send_interval(@tick_rate, :tick)
    :timer.send_interval(@enemy_spawn_rate, :spawn_enemy)

    button_id = Entity.generate_id()

    button = %{
      id: button_id,
      type: :button,
      update_fn: nil,
      interact_fn: fn state, _interacting_entity, interactable ->
        enemy = create_enemy(interactable.x, interactable.y)
        put_in(state.entities[enemy.id], enemy)
      end,
      x: 0,
      y: 0,
      radius: 400,
      health: 0,
      max_health: 1,
      collision_mask: @collision_mask_player_interactable
    }

    {:ok,
     %{
       room_id: room_id,
       entities: %{button_id => button}
     }}
  end

  @impl true
  def handle_call({:join, player_id}, _from, state) do
    player = %Player{
      id: player_id,
      type: :player,
      max_health: 100,
      health: 100,
      x: 0,
      y: 0,
      radius: 24,
      inventory: Inventory.new() |> Inventory.populate_with_test_data(),
      collision_mask: @collision_mask_player + @collision_mask_player_interactable
    }

    join_payload = %{
      player: player,
      tick_rate: @tick_rate,
      map: Maps.get_map("level_0")
    }

    state = put_in(state.entities[player_id], player)
    {:reply, {:ok, join_payload}, state}
  end

  @impl true
  def handle_call({:update_entity_player, player_id, payload}, _from, state) do
    player = get_in(state.entities, [player_id])

    player = %Player{
      player
      | x: payload["x"],
        y: payload["y"]
    }

    state = put_in(state.entities[player_id], player)
    {:reply, {:ok, payload}, state}
  end

  @impl true
  def handle_call({:shoot, player_id, payload}, _from, state) do
    player = get_in(state.entities, [player_id])
    radians = payload["radians"]

    projectile_id = Entity.generate_id()

    projectile = %Projectile{
      id: projectile_id,
      type: :projectile,
      update_fn: &Projectile.update/3,
      collision_mask: @collision_mask_enemy,
      x: player.x,
      y: player.y,
      radius: 16,
      radians: radians,
      speed: 500
    }

    state = put_in(state.entities[projectile_id], projectile)

    {:reply, {:ok, projectile_id}, state}
  end

  @impl true
  def handle_call({:interact, entity_id, payload}, _from, state) do
    interact_id = payload["interact_id"]
    interacting_entity = get_in(state.entities, [entity_id])
    interactable = get_in(state.entities, [interact_id])

    if circle_collision?(interacting_entity, interactable) && interactable.interact_fn != nil do
      {:reply, {:ok, interact_id},
       state |> interactable.interact_fn.(interacting_entity, interactable)}
    else
      {:reply, {:ok, interact_id}, state}
    end
  end

  @impl true
  def handle_call({:chat, player_id, payload}, _from, state) do
    player = get_in(state.entities, [player_id])

    player = %{
      player
      | wip_message: payload["message"],
        chat_messages: Enum.take(player.chat_messages, 2)
    }

    state = put_in(state.entities[player_id], player)
    {:reply, {:ok, nil}, state}
  end

  @impl true
  def handle_call({:finalize_chat, player_id, _payload}, _from, state) do
    player = get_in(state.entities, [player_id])

    player = %{
      player
      | wip_message: "",
        chat_messages:
          [Player.ChatMessage.new(player.wip_message) | player.chat_messages] |> Enum.take(3)
    }

    state = put_in(state.entities[player_id], player)
    {:reply, {:ok, nil}, state}
  end

  @impl true
  def handle_call(:get_state, _from, state) do
    {:reply, state, state}
  end

  @impl true
  def handle_info(:tick, state) do
    delta_time = 1 / @tick_rate

    new_state =
      state.entities
      |> Enum.reduce(state, fn {id, _entity}, state ->
        entity = state.entities[id]

        if entity.update_fn != nil do
          state |> entity.update_fn.(delta_time, entity)
        else
          state
        end
      end)

    Endpoint.broadcast!(room_key(state.room_id), "state", new_state)
    {:noreply, new_state}
  end

  @impl true
  def handle_info(:spawn_enemy, state) do
    if map_size(state.entities) < 5 do
      enemy = create_enemy(400, 400)
      state = put_in(state.entities[enemy.id], enemy)
      {:noreply, state}
    else
      Logger.info("Not spawning enemy, too many enemies")
      {:noreply, state}
    end
  end

  @impl true
  def handle_info(%{event: "presence_diff", payload: %{joins: _, leaves: leaves}}, state) do
    entities =
      Enum.filter(state.entities, fn {player_id, _player} ->
        not Map.has_key?(leaves, player_id)
      end)
      |> Map.new()

    {:noreply, %{state | entities: entities}}
  end

  @impl true
  def handle_info(%{topic: "room:" <> _room_id}, state) do
    {:noreply, state}
  end

  defp room_key(room_id) do
    "room:#{room_id}"
  end

  defp via_tuple(room_id) do
    {:via, Registry, {Notmg.RoomRegistry, room_id}}
  end

  def circle_collision?(obj1, obj2) do
    distance = :math.sqrt(:math.pow(obj1.x - obj2.x, 2) + :math.pow(obj1.y - obj2.y, 2))

    Bitwise.band(obj1.collision_mask, obj2.collision_mask) > 0 &&
      distance < obj1.radius + obj2.radius
  end
end
