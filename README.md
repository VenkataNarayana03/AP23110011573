# Vehicle Maintenance Scheduler Microservice

Node.js microservice for selecting the best set of vehicle maintenance tasks within a daily mechanic-hour budget.

## Run

```bash
npm start
```

Environment variables:

```bash
PORT=3000
BASE_URL=http://localhost:3000
LOG_API_URL=https://20.207.122.201/evaluation-service/logs
LOG_ACCESS_TOKEN=<fresh token generated for the same evaluation-service host>
DEPOT_API_URL=<optional depot API URL>
TASKS_API_URL=<optional task API URL>
```

## API

### Health

`GET /health`

### Create Maintenance Schedule

`POST /schedule`

The service accepts direct task data:

```json
{
  "depotId": "depot-1",
  "budget": 8,
  "tasks": [
    { "vehicleId": "truck-1", "duration": 3, "score": 40 },
    { "vehicleId": "van-2", "duration": 4, "score": 50 },
    { "vehicleId": "truck-3", "duration": 5, "score": 65 }
  ]
}
```

It returns the highest-impact subset whose total duration fits within the budget:

```json
{
  "depotId": "depot-1",
  "availableHours": 8,
  "usedHours": 8,
  "unusedHours": 0,
  "totalImpactScore": 105,
  "selectedVehicles": [
    { "taskId": "truck-1", "vehicleId": "truck-1", "duration": 3, "score": 40 },
    { "taskId": "truck-3", "vehicleId": "truck-3", "duration": 5, "score": 65 }
  ]
}
```

Aliases are supported for common API payloads:

- Budget: `budget`, `availableHours`, `mechanicHours`, `dailyMechanicHours`
- Tasks: `tasks`, `vehicles`, `serviceRequests`, `data`
- Duration: `duration`, `hours`, `serviceDuration`, `estimatedHours`
- Score: `score`, `importance`, `impact`, `impactScore`, `operationalImpact`

If `DEPOT_API_URL` and `TASKS_API_URL` are configured, `/schedule` can also fetch the budget and task list by `depotId`.

## Logging Package

The reusable logger is available at `logging-middleware/index.js`.

```js
const { Log } = require("./logging-middleware");

await Log("backend", "info", "service", "Created maintenance schedule");
```
