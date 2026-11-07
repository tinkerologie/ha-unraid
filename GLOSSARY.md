# Unraid in Home Assistant

This glossary gives terms for Unraid servers and their resources in Home Assistant.

## Language

**Unraid server**:
An Unraid system that supplies storage and operates workloads.
_Avoid_: device when referring to the server itself

**Config entry**:
A Home Assistant configuration for one Unraid server.
_Avoid_: server UUID, device

**Server device**:
The device in Home Assistant that groups the entities of one Unraid server.
_Avoid_: a separate device for each container or disk

**Server UUID**:
The server identifier that the firmware gives. Some servers give the same placeholder UUID.
_Avoid_: guaranteed unique server identity

**Server identity**:
The identity that Home Assistant uses to distinguish one Unraid server and its entities from others.
_Avoid_: raw UUID as an interchangeable term

**Entity**:
An item in Home Assistant that shows a value, state, event, or control.
_Avoid_: sensor when referring to each entity platform

**Entity unique ID**:
The persistent identity of an entity in the integration.
_Avoid_: entity ID

**Entity ID**:
The address of an entity in Home Assistant dashboards and automations. The user can change this address.
_Avoid_: entity unique ID

**Resource**:
A part of an Unraid server, for example a container, VM, disk, share, or UPS.
_Avoid_: device when referring to a server resource

**Dynamic resource**:
A server resource that can appear, disappear, or return with the same name while the integration operates.
_Avoid_: temporary entity

**Docker container**:
A workload that the Docker engine controls. A new container can have the same name and a different ID.
_Avoid_: Docker image

**Virtual machine (VM)**:
A guest machine that the Unraid server controls.
_Avoid_: Docker container

**Array**:
The Unraid storage array with data disks and parity disks if present.
_Avoid_: all server storage

**Array disk**:
A disk in the array storage view. The view has data, parity, cache, and boot disks.
_Avoid_: physical disk as an interchangeable term

**Physical disk**:
A hardware storage device. The disk can belong to the array storage view or be separate.
_Avoid_: array slot

**Share**:
A storage location with a name that Unraid makes available.
_Avoid_: physical disk

**Parity check**:
An operation that checks array parity. The operation can also correct parity if you request correction.
_Avoid_: parity history

**Parity history**:
The record of completed parity operations.
_Avoid_: current parity status

**Disk standby**:
The low-power condition of a disk when the disk does not rotate.
_Avoid_: disk removed, disk unavailable

**UPS**:
An uninterruptible power supply for the Unraid server.
_Avoid_: server power consumption

**Notification**:
An Unraid message with an ID, content, importance, and read or archive status.
_Avoid_: Home Assistant repair

**Notification event**:
An event that tells Home Assistant automations about a new Unraid notification.
_Avoid_: unread count

**Repair issue**:
A Home Assistant notice that tells the user about a problem and a possible action.
_Avoid_: Unraid notification

**Docker statistics stall**:
A condition in which active containers stop sending statistics for a period of time. Enabled Home Assistant entities need these statistics.
_Avoid_: all server data unavailable

**API version**:
The version of the Unraid GraphQL API. You can update the API independently of Unraid OS.
_Avoid_: Unraid OS version
