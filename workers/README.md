# Development job workers

These workers are a **local demonstration adapter**, not production integrations. They register every job type used by the BPMN so service/send tasks do not remain activated forever when running locally. Notifications are printed to the terminal; no email or WhatsApp is sent. Allocation changes are returned as process variables; no database transaction is performed.

## Requirements

- Node.js 18+ and npm
- Camunda 8 / Zeebe gateway reachable at `localhost:26500` (usual local Camunda 8 Run address)
- BPMN and DMN deployed to the same cluster

## Start

From this directory:

```bash
npm install
# Windows PowerShell
$env:ZEEBE_ADDRESS = "localhost:26500"
npm start
```

For cmd.exe:

```bat
set ZEEBE_ADDRESS=localhost:26500
npm start
```

Keep the terminal open. It should print a registration line for each worker. If your Zeebe gateway is not at `localhost:26500`, set `ZEEBE_ADDRESS` to the correct host and port. For SaaS/secured clusters, configure the SDK's TLS/OAuth connection settings for your cluster; do not use the local no-TLS configuration.

## Worker types

`validate-proposal`, `similarity-check`, `load-guide-roster`, `reserve-guide-slot`, `release-guide-slot`, `record-guide-decline`, `record-allocation`, `record-withdrawal`, and `send-notification`.

## Start data

Start a **new** process instance with `../samples/start-instance.json`. It includes the proposal title, abstract, and 2–4 unique team member IDs required by the validation worker. If you started an instance without these fields, either add the missing variables using Operate's supported variable modification workflow (if enabled) or cancel that test instance and start a new one with the sample data.

## Deliberate limitations

- Similarity checking is a deterministic demo value unless `similarityScore` is supplied. It does not compare a real topic corpus.
- Notifications are console output only.
- Guide reservations are process-variable updates and are not safe for concurrent allocation across process instances.
- User tasks do not have embedded forms; set variables through Tasklist or a task form/application.
- Test thoroughly before connecting real mail, databases, or guide workload systems.
