defmodule NotmgWeb.UserSocket do
  use Phoenix.Socket

  channel "room:*", NotmgWeb.RoomChannel

  @impl true
  def connect(_params, socket, _connect_info) do
    {:ok, socket}
  end

  @impl true
  def id(_socket), do: nil
end
