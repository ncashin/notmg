defmodule Notmg.Room do
  use GenServer
  alias Notmg.{Player, Enemy, Projectile, Entity, Inventory}
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

  def update_enemy(room_id, enemy) do
    GenServer.call(via_tuple(room_id), {:update_entity_server, enemy})
  end

  def update_entity(room_id, entity) do
    GenServer.call(via_tuple(room_id), {:update_entity_server, entity})
  end

  def shoot(room_id, player_id, payload) do
    GenServer.call(via_tuple(room_id), {:shoot, player_id, payload})
  end

  def interact(room_id, player_id, payload) do
    GenServer.call(via_tuple(room_id), {:interact, player_id, payload})
  end

  def get_state(room_id) do
    GenServer.call(via_tuple(room_id), :get_state)
  end

  def create_entity(room_id, entity) do
    entity = %{entity | id: Entity.generate_id()}
    if entity.ai != nil do
      {:ok, entity_ai_pid} = apply(entity.ai, :start_link, [entity.id, entity, room_id])
      %{entity | ai_pid: entity_ai_pid}
    else
      %{entity | ai_pid: nil}
    end
  end
  def destroy_entity(entity) do
    if entity.ai != nil do
      Logger.info("Stopping entity AI for #{entity.id}")
      apply(entity.ai, :stop, [entity.id])
    end
  end


  def create_enemy(room_id, x, y) do
    enemy = %Enemy{
      type: :leviathan,
      ai: Notmg.EnemyAI,
      max_health: 50,
      health: 50,
      x: x,
      y: y,
      radius: 48,
      collision_mask: @collision_mask_enemy,
    }
    create_entity(room_id, enemy);
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
      ai: nil,
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
       entities: %{button_id => button},
     }}
  end

  @impl true
  def handle_call({:join, player_id}, _from, state) do
    player = %Player{
      type: :player,
      ai: nil,
      ai_pid: nil,

      x: 0,
      y: 0,
      radius: 24,
      collision_mask: @collision_mask_player + @collision_mask_player_interactable,

      max_health: 100,
      health: 100,

      id: player_id,

      inventory: Inventory.new() |> Inventory.populate_with_test_data(),
    }

    state = put_in(state.entities[player_id], player)
    {:reply, {:ok, player}, state}
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
  def handle_call({:update_entity_server, updated_enemy}, _from, state) do
    enemy_id = updated_enemy.id

    case state.entities[enemy_id] do
      nil ->
        {:reply, {:ok, nil}, state}

      enemy ->
        state = put_in(state.entities[enemy_id], updated_enemy)
        {:reply, {:ok, nil}, state}
    end
  end

  @impl true
  def handle_call({:shoot, player_id, payload}, _from, state) do
    player = get_in(state.entities, [player_id])
    radians = payload["radians"]

    projectile = create_entity(state.room_id, %Projectile{
      type: :projectile,
      ai: Notmg.ProjectileAI,

      x: player.x,
      y: player.y,
      radius: 16,
      collision_mask: @collision_mask_enemy,

      radians: radians,
    })

    state = put_in(state.entities[projectile.id], projectile)

    {:reply, {:ok, projectile.id}, state}
  end

  @impl true
  def handle_call({:interact, player_id, payload}, _from, state) do
    interact_id = payload["interact_id"]
    player = get_in(state.entities, [player_id])
    interactable = get_in(state.entities, [interact_id])

    if circle_collision?(player, interactable) do
      enemy = create_enemy(state.room_id, interactable.x, interactable.y)
      state = put_in(state.entities[enemy.id], enemy)
      {:reply, {:ok, interact_id}, state}
    else
      {:reply, {:ok, interact_id}, state}
    end
  end

  @impl true
  def handle_call(:get_state, _from, state) do
    {:reply, state, state}
  end

  @impl true
  def handle_info(:tick, state) do
    Endpoint.broadcast!(room_key(state.room_id), "state", state)
    {:noreply, state}
  end

  @impl true
  def handle_info(:spawn_enemy, state) do
    if map_size(state.entities) < 5 do
      enemy = create_enemy(state.room_id, 400, 400)
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
    Bitwise.band(obj1.collision_mask, obj2.collision_mask) > 0 && distance < obj1.radius + obj2.radius
  end
end
