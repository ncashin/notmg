defmodule Notmg.Room do
  use GenServer
  alias NotmgWeb.Endpoint
  require Logger

  @tick_rate 32

  def tick_rate, do: @tick_rate

  def start_link(room_id) do
    GenServer.start_link(__MODULE__, room_id, name: via_tuple(room_id))
  end

  def join(room_id, player_id) do
    GenServer.call(via_tuple(room_id), {:join, player_id})
  end

  def update(room_id, player_id, payload) do
    GenServer.call(via_tuple(room_id), {:update, player_id, payload})
  end

  def shoot(room_id, player_id, payload) do
    GenServer.call(via_tuple(room_id), {:shoot, player_id, payload})
  end

  def get_state(room_id) do
    GenServer.call(via_tuple(room_id), :get_state)
  end

  @impl true
  def init(room_id) do
    Logger.info("Starting room #{room_id}")

    projectile_id = "test_projectile"

    projectile = %{
      radius: 16,
      x: 0,
      y: 0,
      velocity_x: 200,
      velocity_y: 200
    }

    enemy_id = "test_gremlin"

    enemy = %{
      type: :leviathan,
      radius: 64,
      max_health: 50,
      health: 50,
      x: 200,
      y: 200,
      velocity_x: 0,
      velocity_y: 200
    }

    Endpoint.subscribe(room_key(room_id))

    :timer.send_interval(@tick_rate, :tick)

    {:ok,
     %{
       room_id: room_id,
       players: %{},
       projectiles: %{
         projectile_id => projectile
       },
       enemies: %{
         enemy_id => enemy
       }
     }}
  end

  @impl true
  def handle_call({:join, player_id}, _from, state) do
    player = %{
      radius: 48,
      max_health: 100,
      health: 100,
      x: 0,
      y: 0,
      velocity_x: 0,
      velocity_y: 0
    }

    state = put_in(state.players[player_id], player)
    {:reply, {:ok, player}, state}
  end

  @impl true
  def handle_call({:update, player_id, payload}, _from, state) do
    player = get_in(state.players, [player_id])

    player = %{
      player
      | x: payload["x"],
        y: payload["y"],
        velocity_x: payload["velocity_x"],
        velocity_y: payload["velocity_y"]
    }

    state = put_in(state.players[player_id], player)
    {:reply, {:ok, payload}, state}
  end

  @impl true
  def handle_call({:shoot, player_id, payload}, _from, state) do
    player = get_in(state.players, [player_id])

    radians = payload["radians"]
    speed = 500

    projectile = %{
      radius: 16,
      x: player.x,
      y: player.y,
      velocity_x: :math.cos(radians) * speed,
      velocity_y: :math.sin(radians) * speed,
      creation_time: System.system_time(:second)
    }

    projectile_id = :crypto.strong_rand_bytes(16) |> Base.encode64()
    state = put_in(state.projectiles[projectile_id], projectile)

    {:reply, {:ok, projectile_id}, state}
  end

  @impl true
  def handle_call(:get_state, _from, state) do
    {:reply, state, state}
  end

  @impl true
  def handle_info(:tick, state) do
    delta_time = 1 / @tick_rate

    projectiles =
      Enum.map(state.projectiles, fn {projectile_id, projectile} ->
        projectile = %{
          projectile
          | x: projectile.x + projectile.velocity_x * delta_time,
            y: projectile.y + projectile.velocity_y * delta_time
        }

        {projectile_id, projectile}
      end)
      |> Enum.filter(fn {_projectile_id, projectile} ->
        if Map.has_key?(projectile, :creation_time) do
          projectile.creation_time + 3 > System.system_time(:second)
        else
          true
        end
      end)
      |> Map.new()

    enemies =
      Enum.map(state.enemies, fn {enemy_id, enemy} ->
        enemy = %{
          enemy
          | x: enemy.x + enemy.velocity_x * delta_time,
            y: enemy.y + enemy.velocity_y * delta_time
        }

        enemy =
          if enemy.x > 400 do
            %{enemy | x: 0}
          else
            enemy
          end

        enemy =
          if enemy.y > 400 do
            %{enemy | y: 0}
          else
            enemy
          end

        enemy =
          Enum.reduce(projectiles, enemy, fn {_projectile_id, projectile}, acc_enemy ->
            if circle_collision?(projectile, acc_enemy) do
              %{acc_enemy | health: acc_enemy.health - 5}
            else
              acc_enemy
            end
          end)

        {enemy_id, enemy}
      end)
      |> Enum.filter(fn {_enemy_id, enemy} ->
        enemy.health > 0
      end)
      |> Map.new()

    projectiles =
      Enum.filter(projectiles, fn {_projectile_id, projectile} ->
        not Enum.any?(enemies, fn {_enemy_id, enemy} ->
          circle_collision?(projectile, enemy)
        end)
      end)
      |> Map.new()

    state = %{state | projectiles: projectiles, enemies: enemies}

    Endpoint.broadcast!(room_key(state.room_id), "state", state)
    {:noreply, state}
  end

  @impl true
  def handle_info(%{event: "presence_diff", payload: %{joins: _, leaves: leaves}}, state) do
    players =
      Enum.filter(state.players, fn {player_id, _player} ->
        not Map.has_key?(leaves, player_id)
      end)
      |> Map.new()

    {:noreply, %{state | players: players}}
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

  defp circle_collision?(obj1, obj2) do
    distance = :math.sqrt(:math.pow(obj1.x - obj2.x, 2) + :math.pow(obj1.y - obj2.y, 2))
    distance < (obj1.radius + obj2.radius)
  end
end
