import { css } from "lit";
import { themeTokens } from "./styles";

export const dashboardCardStyles = [
  themeTokens,
  css`
    :host {
      display: block;
      box-sizing: border-box;
      container-type: inline-size;
      font-family: var(--ha-card-font-family, var(--ha-font-family-body, inherit));
      font-size: var(--ha-font-size-m, 14px);
      line-height: var(--ha-line-height-normal, 1.6);
    }
    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }
    ha-card {
      padding: var(--ha-space-4, 16px);
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-3, 12px);
      background: var(--unraid-card-bg);
      border: var(--ha-card-border-width, 1px) solid var(--unraid-border);
      border-radius: var(--unraid-radius);
      color: var(--unraid-text);
    }
    :host([embedded]) ha-card {
      border: none;
      box-shadow: none;
      background: transparent;
      padding: 0;
    }
    button,
    input,
    select {
      font: inherit;
    }
    button {
      color: inherit;
      text-align: inherit;
      cursor: pointer;
      touch-action: manipulation;
    }
    button:disabled {
      cursor: default;
      opacity: 0.6;
    }
    [role="tabpanel"][hidden] {
      display: none;
    }
    [role="tabpanel"] {
      min-width: 0;
    }
    :where(button, a, input, select, [tabindex]):focus-visible {
      outline: 2px solid var(--unraid-focus);
      outline-offset: 2px;
    }
    .icon {
      display: inline-block;
      vertical-align: middle;
      fill: currentColor;
      flex-shrink: 0;
    }
    .sr-only {
      position: absolute;
      inline-size: 1px;
      block-size: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
      border: 0;
    }
    .header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--ha-space-3, 12px);
    }
    .header-main {
      display: flex;
      flex: 1;
      align-items: center;
      gap: var(--ha-space-3, 12px);
      min-width: 0;
    }
    .header-icon {
      inline-size: var(--ha-space-10, 40px);
      block-size: var(--ha-space-10, 40px);
      border-radius: var(--ha-border-radius-lg, 12px);
      background: color-mix(in srgb, var(--unraid-accent) 12%, transparent);
      color: var(--unraid-accent);
      display: grid;
      place-items: center;
      flex-shrink: 0;
    }
    .header-titles {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .header-title {
      margin: 0;
      font-size: var(--ha-card-header-font-size, var(--ha-font-size-l, 16px));
      font-weight: var(--ha-font-weight-heading, 700);
      color: var(--unraid-text);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      line-height: var(--ha-line-height-condensed, 1.2);
    }
    .header-subtitle {
      font-size: var(--ha-font-size-s, 12px);
      color: var(--unraid-subtext);
      overflow-wrap: anywhere;
    }
    .header-actions {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: var(--ha-space-2, 8px);
      margin-inline-start: auto;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: var(--ha-space-1, 4px);
      padding: var(--ha-space-1, 4px) var(--ha-space-2, 8px);
      border-radius: var(--ha-border-radius-pill, 9999px);
      font-size: var(--ha-font-size-s, 12px);
      font-weight: var(--ha-font-weight-medium, 500);
      line-height: var(--ha-line-height-condensed, 1.2);
      white-space: nowrap;
      color: var(--unraid-text);
      border: 1px solid var(--unraid-border);
    }
    button.badge {
      min-block-size: var(--ha-space-10, 40px);
      min-inline-size: var(--ha-space-10, 40px);
    }
    .badge-online {
      background: color-mix(in srgb, var(--unraid-online) 12%, var(--unraid-card-bg));
      border-color: color-mix(in srgb, var(--unraid-online) 35%, var(--unraid-card-bg));
    }
    .badge-warning {
      background: color-mix(in srgb, var(--unraid-warning) 12%, var(--unraid-card-bg));
      border-color: color-mix(
        in srgb,
        var(--unraid-warning) 35%,
        var(--unraid-card-bg)
      );
    }
    .badge-error {
      background: color-mix(in srgb, var(--unraid-error) 12%, var(--unraid-card-bg));
      border-color: color-mix(in srgb, var(--unraid-error) 35%, var(--unraid-card-bg));
    }
    .badge-standby {
      background: color-mix(in srgb, var(--unraid-standby) 12%, var(--unraid-card-bg));
    }
    .pulse-dot {
      inline-size: var(--ha-space-2, 8px);
      block-size: var(--ha-space-2, 8px);
      border-radius: 50%;
      background: currentColor;
    }
    .rings-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 80px), 1fr));
      gap: var(--ha-space-2, 8px);
    }
    .rings-grid.two {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .ring-card {
      background: color-mix(in srgb, var(--unraid-text) 3%, transparent);
      border: 1px solid var(--unraid-border);
      border-radius: var(--ha-border-radius-lg, 12px);
      padding: var(--ha-space-3, 12px) var(--ha-space-2, 8px);
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: var(--ha-space-1, 4px);
      min-width: 0;
    }
    .ring-gauge {
      inline-size: var(--ha-space-14, 56px);
      block-size: var(--ha-space-14, 56px);
      border-radius: 50%;
      position: relative;
      display: grid;
      place-items: center;
      flex-shrink: 0;
      background: conic-gradient(
        var(--ring-color, var(--unraid-primary)) calc(var(--pct, 0) * 1%),
        color-mix(in srgb, var(--unraid-text) 55%, var(--unraid-card-bg)) 0
      );
    }
    .ring-gauge::after {
      content: "";
      position: absolute;
      inset: var(--ha-space-2, 8px);
      border-radius: 50%;
      background: var(--unraid-card-bg);
    }
    .ring-content {
      position: relative;
      z-index: 2;
      font-size: var(--ha-font-size-m, 14px);
      font-weight: var(--ha-font-weight-bold, 700);
      color: var(--unraid-text);
    }
    .ring-label {
      font-size: var(--ha-font-size-s, 12px);
      font-weight: var(--ha-font-weight-medium, 500);
      color: var(--unraid-text);
      line-height: var(--ha-line-height-condensed, 1.2);
    }
    .ring-subtext {
      font-size: var(--ha-font-size-s, 12px);
      color: var(--unraid-subtext);
      line-height: var(--ha-line-height-condensed, 1.2);
      overflow-wrap: anywhere;
    }
    .progress-bar {
      width: 100%;
      height: var(--ha-space-2, 8px);
      background: color-mix(in srgb, var(--unraid-text) 55%, var(--unraid-card-bg));
      border-radius: var(--ha-border-radius-pill, 9999px);
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: var(--fill-color, var(--unraid-accent));
      border-radius: inherit;
      transition: width var(--ha-animation-duration-normal, 250ms) ease;
    }
    .item-list {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-2, 8px);
    }
    .list-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--ha-space-2, 8px) var(--ha-space-3, 12px);
      border-radius: var(--ha-border-radius-lg, 12px);
      background: color-mix(in srgb, var(--unraid-text) 3%, transparent);
      border: 1px solid var(--unraid-border);
      gap: var(--ha-space-3, 12px);
      font-size: var(--ha-font-size-m, 14px);
      min-width: 0;
      transition: border-color var(--ha-animation-duration-fast, 150ms) ease;
    }
    button.ring-card {
      border-color: var(--unraid-control-border);
    }
    button.list-row {
      border-color: var(--unraid-control-border);
      width: 100%;
      min-block-size: var(--ha-space-12, 48px);
    }
    .list-row:hover {
      border-color: color-mix(in srgb, var(--unraid-primary) 50%, var(--unraid-text));
    }
    .row-left {
      display: flex;
      align-items: center;
      gap: var(--ha-space-2, 8px);
      min-width: 0;
      flex: 1;
    }
    .row-right {
      display: flex;
      align-items: center;
      gap: var(--ha-space-2, 8px);
      flex-shrink: 0;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--ha-space-2, 8px);
      min-block-size: var(--ha-space-10, 40px);
      min-inline-size: var(--ha-space-10, 40px);
      padding: var(--ha-space-2, 8px) var(--ha-space-3, 12px);
      border-radius: var(--ha-border-radius-pill, 9999px);
      font-size: var(--ha-font-size-m, 14px);
      font-weight: var(--ha-font-weight-action, 500);
      border: 1px solid var(--unraid-control-border);
      background: color-mix(in srgb, var(--unraid-text) 6%, transparent);
      color: var(--unraid-text);
      transition: background-color var(--ha-animation-duration-fast, 150ms) ease;
    }
    .btn:hover {
      background: color-mix(in srgb, var(--unraid-text) 12%, transparent);
    }
    .btn-primary {
      background: color-mix(in srgb, var(--unraid-primary) 12%, var(--unraid-card-bg));
      color: var(--unraid-text);
      border-color: color-mix(in srgb, var(--unraid-primary) 50%, var(--unraid-text));
    }
    .btn-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-inline-size: var(--ha-space-12, 48px);
      min-block-size: var(--ha-space-12, 48px);
      padding: var(--ha-space-2, 8px);
      border-radius: var(--ha-border-radius-pill, 9999px);
      border: 1px solid transparent;
      background: transparent;
      color: var(--unraid-subtext);
    }
    .btn-icon:hover {
      background: color-mix(in srgb, var(--unraid-text) 8%, transparent);
      color: var(--unraid-text);
    }
    .container-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr));
      gap: var(--ha-space-2, 8px);
    }
    .container-tile {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--ha-space-2, 8px);
      border-radius: var(--ha-border-radius-lg, 12px);
      background: color-mix(in srgb, var(--unraid-text) 4%, transparent);
      border: 1px solid var(--unraid-border);
      gap: var(--ha-space-1, 4px);
      min-width: 0;
      transition: border-color var(--ha-animation-duration-fast, 150ms) ease;
    }
    .container-tile:hover {
      border-color: color-mix(in srgb, var(--unraid-primary) 50%, var(--unraid-text));
    }
    .tile-main,
    .workload-name-button {
      display: flex;
      align-items: center;
      gap: var(--ha-space-2, 8px);
      min-width: 0;
      min-block-size: var(--ha-space-12, 48px);
      flex: 1;
      border: 0;
      background: transparent;
      padding: var(--ha-space-1, 4px);
      border-radius: var(--ha-border-radius-md, 8px);
      color: var(--unraid-text);
    }
    .workload-label {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .tile-name,
    .vm-name {
      font-size: var(--ha-font-size-m, 14px);
      font-weight: var(--ha-font-weight-medium, 500);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      min-width: 0;
    }
    .workload-status {
      font-size: var(--ha-font-size-s, 12px);
      color: var(--unraid-subtext);
    }
    .status-dot {
      width: var(--ha-space-2, 8px);
      height: var(--ha-space-2, 8px);
      border-radius: 50%;
      flex-shrink: 0;
    }
    .status-dot.online {
      background: var(--unraid-online);
    }
    .status-dot.paused {
      background: var(--warning-color, var(--unraid-warning, var(--unraid-standby)));
    }
    .status-dot.offline {
      background: var(--unraid-standby);
      border-radius: 2px;
    }
    .divider {
      height: 1px;
      background: var(--unraid-border);
      width: 100%;
      margin: var(--ha-space-1, 4px) 0;
    }
    .detail-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 140px), 1fr));
      gap: var(--ha-space-3, 12px);
      font-size: var(--ha-font-size-m, 14px);
    }
    /* Static and clickable items share one box, so both rows line up. */
    .detail-item {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: var(--ha-space-1, 4px);
      min-width: 0;
      min-block-size: var(--ha-space-12, 48px);
      padding: var(--ha-space-1, 4px);
      border: 1px solid transparent;
      border-radius: var(--ha-border-radius-md, 8px);
      box-sizing: border-box;
    }
    button.detail-item {
      background: transparent;
    }
    .detail-label {
      color: var(--unraid-subtext);
      font-size: var(--ha-font-size-s, 12px);
    }
    .detail-val {
      max-inline-size: 100%;
      font-weight: var(--ha-font-weight-medium, 500);
      color: var(--unraid-text);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    a.detail-val {
      display: inline-flex;
      align-items: center;
      min-block-size: var(--ha-space-10, 40px);
      white-space: normal;
      overflow-wrap: anywhere;
      text-decoration: underline;
      text-decoration-color: var(--unraid-accent);
    }
    .tab-strip {
      display: flex;
      gap: var(--ha-space-1, 4px);
      overflow-x: auto;
      padding: var(--ha-space-1, 4px);
      border-block-end: 1px solid var(--unraid-border);
      min-width: 0;
    }
    .tab-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--ha-space-2, 8px);
      min-block-size: var(--ha-space-10, 40px);
      padding: var(--ha-space-2, 8px) var(--ha-space-3, 12px);
      border-radius: var(--ha-border-radius-pill, 9999px);
      font-size: var(--ha-font-size-m, 14px);
      font-weight: var(--ha-font-weight-action, 500);
      background: transparent;
      border: 2px solid transparent;
      color: var(--unraid-subtext);
      cursor: pointer;
      white-space: nowrap;
      transition: background-color var(--ha-animation-duration-fast, 150ms) ease;
    }
    .tab-btn:hover {
      color: var(--unraid-text);
      background: color-mix(in srgb, var(--unraid-text) 5%, transparent);
    }
    .tab-btn.active {
      background: color-mix(in srgb, var(--unraid-primary) 12%, var(--unraid-card-bg));
      color: var(--unraid-text);
      border-color: color-mix(in srgb, var(--unraid-primary) 50%, var(--unraid-text));
    }
    input[type="search"] {
      min-block-size: var(--ha-space-14, 56px);
      font: inherit;
    }
    label {
      font-size: var(--ha-font-size-s, 12px);
      color: var(--unraid-subtext);
    }
    .empty-state {
      padding: var(--ha-space-4, 16px);
      text-align: center;
      color: var(--unraid-subtext);
    }
    .network-row {
      overflow-wrap: anywhere;
    }
    .network-row > span {
      display: flex;
      flex-wrap: wrap;
      gap: var(--ha-space-2, 8px);
    }
    @container (max-width: 360px) {
      .header-main {
        flex-basis: 100%;
      }
      .list-row {
        flex-wrap: wrap;
      }
      .row-left {
        flex-wrap: wrap;
      }
      .workload-name-button {
        flex-basis: 100%;
      }
      .row-right {
        flex-wrap: wrap;
        justify-content: flex-end;
        margin-inline-start: auto;
        max-width: 100%;
      }
      .list-row > .row-right {
        flex-basis: 100%;
      }
      .container-tile {
        flex-wrap: wrap;
      }
      .tile-main {
        flex-basis: 100%;
      }
      .network-row .row-left {
        flex-wrap: wrap;
      }
    }
    @container (max-width: 240px) {
      .rings-grid.two {
        grid-template-columns: 1fr;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      *,
      *::before,
      *::after {
        animation: none !important;
        transition: none !important;
        scroll-behavior: auto !important;
      }
    }
  `,
];
