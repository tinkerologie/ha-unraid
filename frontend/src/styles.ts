import { css } from "lit";

export const themeTokens = css`
  :host {
    --unraid-primary: var(
      --primary-color,
      var(--ha-color-fill-primary-loud-resting, #03a9f4)
    );
    --unraid-accent: var(--unraid-primary);
    --unraid-online: var(--success-color, #00883c);
    --unraid-warning: var(--warning-color, #c94e00);
    --unraid-error: var(--error-color, #db4437);
    --unraid-standby: var(--disabled-text-color, #7a7a7a);
    --unraid-info: var(--info-color, var(--unraid-primary));
    --unraid-card-bg: var(--ha-card-background, var(--card-background-color, #ffffff));
    --unraid-border: var(--ha-card-border-color, var(--divider-color, #e0e0e0));
    --unraid-radius: var(--ha-card-border-radius, var(--ha-border-radius-lg, 12px));
    --unraid-text: var(--primary-text-color, var(--ha-color-text-primary, #212121));
    --unraid-subtext: var(
      --secondary-text-color,
      var(--ha-color-text-secondary, #5e5e5e)
    );
    --unraid-control-border: var(--secondary-text-color, var(--unraid-subtext));
    --unraid-focus: var(--ha-color-focus, var(--unraid-text));
  }
`;
