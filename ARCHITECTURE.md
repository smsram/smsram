# 🗺️ Subdomain & Core System Architecture Specification

This document details the internal technical layout, state synchronization scripts, and decoupled routing rules powering this full-stack ecosystem.

---

## 🌐 1. Subdomain Matrix & Next.js Routing
The entry nodes use Next.js edge middleware rewrites to isolate administrative operational control views from the public portfolio interface across separate subdomains.


```
              ┌───────────────┐
              │  Root Request │
              └───────┬───────┘
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
[ Host: admin.* ]             [ Host: hub.* ]
        │                           │
Internal Rewrite to:        Internal Rewrite to:
/src/app/admin              /src/app/hub

```

* **Public Node (Main Root):** Professional portfolio landing interface, live case studies, and indexable project documentation layers.
* **Admin Subdomain (`admin.domainname.com`):** Secure dashboard managing data connections. Features a client-side filtered **Dual-Selector Node Connector** configured to link component configurations based on relational behavioral rules.
* **Hub Subdomain (`hub.domainname.com`):** Isolated cloud operations console handling storage pools and database matrix visualizations.

---

## ⚡ 2. Database Resiliency & Background Telemetry Sync
The core API module uses an Express engine connected to a relational schema pool. It is built to serve pages quickly by utilizing a distinct read-and-refresh thread split:

1. **Instant Fetch Response:** When a metric card requests data, the controller completely bypasses remote APIs and immediately serves the existing state from the `ecosystem_telemetry_cache` database table.
2. **Asynchronous Background worker:** Simultaneously, the thread spawns a non-blocking background lookup promise that hits external developer APIs (GitHub GraphQL, LeetCode, YouTube v3) in a silent execution track.
3. **Targeted DB Updates:** Once the data drops, the database handles an `UPDATE` command targeted specifically by matching platform string identifiers (`youtube`, `github`, `leetcode`), keeping the table fresh for the next user navigation without slowing down current views.

---

## 🛡️ 3. Decoupled Ingestion Engine (`/baas`)
An isolated **Backend-as-a-Service (BaaS)** runtime layer deployed as an independent container instance:
* Processes structural metadata validations.
* Standardizes open data stream ingestion points.
* Validates cryptographic session key signatures.