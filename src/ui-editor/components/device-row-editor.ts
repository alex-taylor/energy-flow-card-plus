import { mdiClose, mdiDrag, mdiPencil } from "@mdi/js";
import { HomeAssistant } from "custom-card-helpers";
import { css, CSSResultGroup, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import { fireEvent } from "custom-card-helpers";
import localize from "@/localize/localize";
import { CARD_NAME, DEVICE_CLASS_ENERGY } from "@/const";
import { ColourOptions, DeviceConfig, EnergyFlowCardExtConfig, EntitiesOptions, EntityOptions, GlobalOptions } from "@/config";
import { deviceSchema } from "../schema/device";
import { ColourMode, DeviceType, UnitDisplayMode } from "@/enums";

export const DEVICE_EDITOR_ELEMENT_NAME = CARD_NAME + "-device-row-editor";

declare global {
  interface HASSDomEvents {
    "devices-changed": {
      entities: DeviceConfig[];
    };

    "edit-detail-element": any;
  }

  interface HassEvent {
    "edit-detail-element": any;
  }
}

@customElement(DEVICE_EDITOR_ELEMENT_NAME)
export class DeviceRowEditor extends LitElement {
  @property({ attribute: false }) protected hass?: HomeAssistant;
  @property({ attribute: false }) protected config?: EnergyFlowCardExtConfig;
  @property({ attribute: false }) protected devices?: DeviceConfig[];
  @state() protected _indexBeingEdited: number = -1;

  private _entityKeys = new WeakMap<DeviceConfig, string>();

  public connectedCallback(): void {
    super.connectedCallback();
    void this.loadHaForm();
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
  }

  private _editRowElement(index: number): void {
    this._indexBeingEdited = index;
  }

  private _getKey(action: DeviceConfig) {
    if (!this._entityKeys.has(action)) {
      this._entityKeys.set(action, Math.random().toString());
    }

    return this._entityKeys.get(action)!;
  }

  private loadHaForm = async () => {
    if (!customElements.get("ha-form")) {
      (customElements.get("hui-button-card") as any)?.getConfigElement();
    }

    if (!customElements.get("ha-entity-picker")) {
      (customElements.get("hui-entities-card") as any)?.getConfigElement();
    }

    if (customElements.get("ha-form")) {
      return;
    }

    const helpers = await (window as any).loadCardHelpers?.();

    if (!helpers) {
      return;
    }
  };

  protected render() {
    if (!this.devices || !this.hass) {
      return html`<p>No entities configured.</p>`;
    }

    if (this._indexBeingEdited !== -1) {
      return html`
        <div class="device-header">
          <h4>${localize("editor.device")} ${this._indexBeingEdited + 1} / ${this.devices.length}</h4>
          <ha-icon-button
            .label=${this.hass!.localize("ui.components.entity.entity-picker.clear")}
            .path=${mdiClose}
            class="remove-icon"
            @click=${() => (this._indexBeingEdited = -1)}
          ></ha-icon-button>
        </div>
        <ha-form
          .hass=${this.hass}
          .data=${this.devices[this._indexBeingEdited]}
          .schema=${deviceSchema(this.config!, this.devices[this._indexBeingEdited])}
          .computeLabel=${this._computeLabelCallback}
          @value-changed=${this._configChanged}
        ></ha-form>
      `;
    }

    return html`
      <ha-sortable handle-selector=".handle" @item-moved=${this._rowMoved}>
      <div class="entities">
        ${repeat(
      this.devices,
      (deviceConf) => this._getKey(deviceConf),
      (deviceConf, index) => html`
            <div class="entity">
              <div class="handle">
                <ha-svg-icon .path=${mdiDrag}></ha-svg-icon>
              </div>
              <ha-entity-picker
                allow-custom-entity
                hide-clear-icon
                include-device-classes='["${DEVICE_CLASS_ENERGY}", "dummy"]' 
                .hass=${this.hass}
                .value=${deviceConf.entities?.entity_ids}
                .index=${index}
                @value-changed=${this._valueChanged}
              ></ha-entity-picker>
              <ha-icon-button
                .label=${this.hass!.localize("ui.components.entity.entity-picker.clear")}
                .path=${mdiClose}
                class="remove-icon"
                .index=${index}
                @click=${this._removeRow}
              ></ha-icon-button>
              <ha-icon-button
                .label=${this.hass!.localize("ui.components.entity.entity-picker.edit")}
                .path=${mdiPencil}
                class="edit-icon"
                .index=${index}
                @click=${() => this._editRowElement(index)}
              ></ha-icon-button>
            </div>
          `
    )}
      </div>
      </ha-sortable>
      <ha-entity-picker hide-clear-icon class="add-entity" include-device-classes='["${DEVICE_CLASS_ENERGY}", "dummy"]' .hass=${this.hass} @value-changed=${this._addDevice}></ha-entity-picker>
    `;
  }

  private _configChanged(ev: any): void {
    if (!this.config || !this.hass) {
      return;
    }

    const devicesConfig: DeviceConfig[] | undefined = this.config.devices?.concat();

    if (!devicesConfig) {
      return;
    }

    const updatedDeviceConfig = ev.detail.value || "";
    devicesConfig[this._indexBeingEdited] = updatedDeviceConfig;

    const config: EnergyFlowCardExtConfig = {
      ...this.config,
      devices: devicesConfig
    };

    fireEvent(this, "config-changed", { config });
  }

  private _computeLabelCallback = (schema: any) => localize(`editor.${schema?.name}`);

  private async _addDevice(ev: CustomEvent): Promise<void> {
    const value = ev.detail.value;

    if (value === "") {
      return;
    }

    const newDevice: DeviceConfig = {
      [EntitiesOptions.Entities]: {
        [EntityOptions.Entity_Ids]: [value],
        [EntityOptions.Units_Mode]: UnitDisplayMode.After
      },
      [EntitiesOptions.Colours]: {
        [ColourOptions.Circle]: ColourMode.Auto,
        [ColourOptions.Icon]: ColourMode.Do_Not_Colour,
        [ColourOptions.Value]: ColourMode.Do_Not_Colour
      },
      [GlobalOptions.Options]: {
        [EntitiesOptions.Device_Type]: DeviceType.Consumption_Electric
      }
    };

    const updatedDevices: DeviceConfig[] = this.devices!.concat(newDevice);
    (ev.target as any).value = "";
    fireEvent(this, "devices-changed", { entities: updatedDevices });
  }

  private _rowMoved(ev: CustomEvent): void {
    if (ev.detail.oldIndex === ev.detail.newIndex) {
      return;
    }

    const updatedDevices = this.devices!.concat();
    updatedDevices.splice(ev.detail.newIndex!, 0, updatedDevices.splice(ev.detail.oldIndex!, 1)[0]);
    fireEvent(this, "devices-changed", { entities: updatedDevices });
  }

  private _removeRow(ev: CustomEvent): void {
    const index = (ev.currentTarget as any).index;
    const updatedDevices = this.devices!.concat();
    updatedDevices.splice(index, 1);
    fireEvent(this, "devices-changed", { entities: updatedDevices });
  }

  private _valueChanged(ev: CustomEvent): void {
    const value = ev.detail.value;
    const index = (ev.target as any).index;
    const updatedDevices = this.devices!.concat();

    if (value === "" || value === undefined) {
      updatedDevices.splice(index, 1);
    } else {
      updatedDevices[index] = {
        ...updatedDevices[index],
        entities: {
          entity_ids: [value]
        }
      };
    }

    fireEvent(this, "devices-changed", { entities: updatedDevices });
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        ha-form {
          width: 100%;
        }

        ha-entity-picker {
          margin-top: 8px;
        }

        .device-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-inline: 0.2rem;
          margin-bottom: 1rem;
        }

        .add-entity {
          display: block;
          margin-left: 31px;
          margin-right: 71px;
          margin-inline-start: 31px;
          margin-inline-end: 71px;
          direction: var(--direction);
        }

        .entity {
          display: flex;
          align-items: center;
        }

        .entity .handle {
          padding-right: 8px;
          cursor: move;
          padding-inline-end: 8px;
          padding-inline-start: initial;
          direction: var(--direction);
        }

        .entity .handle > * {
          pointer-events: none;
        }

        .entity ha-entity-picker {
          flex-grow: 1;
          min-width: 0;
        }

        .special-row {
          height: 60px;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-grow: 1;
        }

        .special-row div {
          display: flex;
          flex-direction: column;
        }

        .remove-icon,
        .edit-icon {
          --mdc-icon-button-size: 36px;
          color: var(--secondary-text-color);
        }

        .secondary {
          font-size: 12px;
          color: var(--secondary-text-color);
        }
      `
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "individual-row-editor": DeviceRowEditor;
  }
}
