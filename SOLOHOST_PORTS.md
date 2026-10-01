# SoloHost Port Manager compatibility (Snake Arcade 2.9)

| Rule | Status |
|---|---|
| App uses only the internal container port, default 8080 | DONE - `PORT` env, `process.env.PORT \|\| 8080` |
| Server listens on 0.0.0.0 | DONE - `srv.listen(PORT, '0.0.0.0')`, reachable on the non-loopback interface in the test |
| No fixed public/host port in Docker/Compose | DONE - `solohost/docker-compose.yml` uses `expose: 8080` (was `127.0.0.1:18080:8080`); root compose publishes the container port only (`"8080"`, was `${HOST_PORT:-8080}:8080`); `HOST_PORT` removed from `.env`/server |
| UI works with any public port | DONE - invite/LAN URLs now use the port the browser actually used (`Host` header); help text shows `:PORT` instead of `:8080`; sockets are same-origin |
| Gameplay / multiplayer / UI unchanged | DONE except the two help-text strings above |

Port mapping at runtime: `docker compose port app 8080` (Docker-assigned) - under SoloHost the Port Manager's mapping applies. `show-ip-windows.bat` reads it automatically.

## Not changed on purpose
`.github/workflows/docker.yml` still smoke-tests with `127.0.0.1:18080+` host ports. That is the CI harness on a throw-away runner, not the shipped app.
