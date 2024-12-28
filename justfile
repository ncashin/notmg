app:
  iex --name notmg@127.0.0.1 --cookie notmg -S mix phx.server

livebook:
  livebook server --port 8010

ldtk:
  rm -rf ./priv/static/assets/map
  mv ./assets/map ./priv/static/assets/
