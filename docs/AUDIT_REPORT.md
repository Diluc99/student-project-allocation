# Static audit and runtime test plan

Audit date: 2026-10-12. Target: Camunda 8.7 as declared by the model.

## Findings and fixes in this package

| Severity | Finding | Resolution / status |
|---|---|---|
| Blocker | `A_BoundaryComp` was configured with `cancelActivity="false"`. Camunda rejects non-interrupting compensation boundary events. | Set `cancelActivity="true"` in the BPMN. |
| Blocker at runtime | `Task_Validate` has job type `validate-proposal`, but the original repository had no worker implementation. This is why the running instance waits at that element. | Added a development worker for every declared job type under `workers/`. Start it before running a new test instance. |
| High | Original start sample lacked fields required to demonstrate a successful form/team validation. | Added `proposalTitle`, `abstract`, `teamMembers`, and initialized loop/decision variables to `samples/start-instance.json`. |
| High / product gap | User tasks have candidate groups but no embedded forms. Tasklist can complete tasks with variables, but the process does not provide a purpose-built data-entry form. | Documented as a limitation. Attach forms or build a task application for production. |
| High / product gap | Send tasks had a worker type but no implementation; no database or real similarity service was included. | Added explicit demo adapters. Notifications log only; similarity score is a supplied/demo value; allocation updates are process variables only. |
| Separate environment issue | Marketplace connector template fetch failed. | Not a BPMN model issue and not required by this process; retry when network/Marketplace is available. |

## Checks to run

1. Open the BPMN in Camunda Modeler targeting Camunda 8.7; verify there are no validation errors.
2. Deploy `dmn/guide-allocation.dmn` and `bpmn/student-project-allocation.bpmn` to the same cluster.
3. Start the worker from `workers/` and confirm all nine job types register.
4. Start a **new** instance with `samples/start-instance.json`.
5. Complete the student submission task. Verify `Task_Validate` completes and `formValid=true`, `teamValid=true` appear in variables.
6. Continue the happy path through screening, similarity review, committee decision, guide allocation, guide acceptance, record allocation, and notification. User tasks must be completed in Tasklist with variables such as `decision="approved"` and `guideResponse="accept"` where requested by gateway conditions.
7. Run separate instances to test invalid form/team, similarity above threshold, committee revision/rejection, guide decline, no-guide availability, timer paths, and withdrawal/compensation. Timers require waiting or changing test durations in a separate test copy.
8. Confirm successful instances reach an end event and Operate reports no incidents.

## Important scope note

Static file inspection cannot prove a live deployment. The development workers are intentionally simple demo implementations; they are not safe substitutes for transactional guide reservation, durable records, real notifications, or real plagiarism/similarity detection.
