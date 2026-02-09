import type { Schema, Struct } from '@strapi/strapi';

export interface InventoryPresetItem extends Struct.ComponentSchema {
  collectionName: 'components_inventory_preset_items';
  info: {
    displayName: 'PresetItem';
    icon: 'dashboard';
  };
  attributes: {
    product: Schema.Attribute.Relation<'oneToOne', 'api::product.product'>;
    quantity: Schema.Attribute.Integer;
  };
}

export interface InventoryRequestItem extends Struct.ComponentSchema {
  collectionName: 'components_inventory_request_items';
  info: {
    displayName: 'RequestItem';
  };
  attributes: {
    product: Schema.Attribute.Relation<'oneToOne', 'api::product.product'>;
    qty_approved: Schema.Attribute.Integer;
    qty_request: Schema.Attribute.Integer;
    remark: Schema.Attribute.String;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'inventory.preset-item': InventoryPresetItem;
      'inventory.request-item': InventoryRequestItem;
    }
  }
}
