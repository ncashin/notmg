defmodule NotmgWeb.RoomChannel do
  use NotmgWeb, :channel
  alias Notmg.Room
  alias NotmgWeb.Presence
  require Logger

  def setup_user_id(socket) do
    user_id = :crypto.strong_rand_bytes(16) |> Base.encode64()
    assign(socket, :user_id, user_id)
  end

  @impl true
  def join("room:" <> room_id, payload, socket) do
    send(self(), :after_join)

    socket = setup_user_id(socket)

    if authorized?(payload) do
      DynamicSupervisor.start_child(Notmg.RoomSupervisor, {Room, room_id})

      case Room.join(room_id, socket.assigns.user_id) do
        {:ok, player} ->
          socket = assign(socket, :room_id, room_id)
          init_message = Map.put(player, :user_id, socket.assigns.user_id)
          init_message = Map.put(init_message, :tick_rate, Room.tick_rate())
          {:ok, init_message, socket}

        {:error, reason} ->
          {:error, %{reason: reason}}
      end
    else
      {:error, %{reason: "unauthorized"}}
    end
  end

  @impl true
  def handle_in("ping", payload, socket) do
    {:reply, {:ok, payload}, socket}
  end

  @impl true
  def handle_in("update", payload, socket) do
    player = %{
      x: payload["x"],
      y: payload["y"],
      velocity_x: payload["velocity_x"],
      velocity_y: payload["velocity_y"]
    }

    Room.update(socket.assigns.room_id, socket.assigns.user_id, player)
    {:reply, {:ok, nil}, socket}
  end

  @impl true
  def handle_info(:after_join, socket) do
    {:ok, _} =
      Presence.track(socket, socket.assigns.user_id, %{
        online_at: inspect(System.system_time(:second))
      })

    push(socket, "presence_state", Presence.list(socket))
    {:noreply, socket}
  end

  @spec authorized?(map()) :: boolean()
  defp authorized?(_payload) do
    true
  end
end
