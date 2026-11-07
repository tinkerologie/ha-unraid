# Unraid in Home Assistant

The integration represents Unraid servers and their resources in Home Assistant for monitoring and control.

## Language

**Unraid server**:
An Unraid system whose storage, workloads, and operational state are monitored or controlled.
_Avoid_: device when referring to the server itself

**Config entry**:
A saved Home Assistant configuration for one Unraid server.
_Avoid_: server UUID, device

**Server device**:
The Home Assistant grouping for the entities belonging to one configured Unraid server.
_Avoid_: a separate device for each container or disk

**Server UUID**:
The server identifier reported by its firmware, which can be a shared placeholder on some hardware.
_Avoid_: guaranteed unique server identity

**Server identity**:
The identity used to distinguish a configured server and its entities from other servers, including servers with placeholder UUIDs.
_Avoid_: raw UUID as an interchangeable term

**Entity**:
A Home Assistant representation of one observed value, state, event stream, or available control.
_Avoid_: sensor when referring to every entity platform

**Entity unique ID**:
The persistent identity of an entity within the integration.
_Avoid_: entity ID

**Entity ID**:
The Home Assistant address used to refer to an entity in dashboards and automations; users can change it.
_Avoid_: entity unique ID

**Resource**:
A monitored or controlled part of an Unraid server, such as a container, VM, disk, share, or UPS.
_Avoid_: device when referring to a server resource

**Dynamic resource**:
A server resource that may appear, disappear, or be recreated while the integration is running.
_Avoid_: temporary entity

**Docker container**:
An application workload managed by the server’s Docker engine; recreation can change its container ID while retaining its name.
_Avoid_: Docker image

**Virtual machine (VM)**:
A guest machine managed by the Unraid server.
_Avoid_: Docker container

**Array**:
The server’s managed storage array, with data disks and any assigned parity disks.
_Avoid_: all server storage

**Array disk**:
A disk represented in the array’s storage view, including data, parity, cache, and boot categories exposed there.
_Avoid_: physical disk as an interchangeable term

**Physical disk**:
A hardware storage device, whether or not it belongs to the array’s storage view.
_Avoid_: array slot

**Share**:
A named storage location exposed by the server.
_Avoid_: physical disk

**Parity check**:
An operation that verifies array parity and may correct it when correction is requested.
_Avoid_: parity history

**Parity history**:
Records of completed parity operations.
_Avoid_: current parity status

**Disk standby**:
The low-power state of a disk that is not spinning.
_Avoid_: disk removed, disk unavailable

**UPS**:
An uninterruptible power supply protecting the server.
_Avoid_: server power consumption

**Notification**:
An Unraid message with its own identity, content, importance, and read or archived state.
_Avoid_: Home Assistant repair

**Notification event**:
An occurrence announcing a newly observed Unraid notification to Home Assistant automations.
_Avoid_: unread count

**Repair issue**:
A Home Assistant notice describing a problem that a user can act on.
_Avoid_: Unraid notification

**Docker statistics stall**:
A sustained absence of expected container statistics while containers are running and statistics consumers are enabled.
_Avoid_: all server data unavailable

**API version**:
The version of the Unraid GraphQL API, which can change independently of the Unraid OS version.
_Avoid_: Unraid OS version
