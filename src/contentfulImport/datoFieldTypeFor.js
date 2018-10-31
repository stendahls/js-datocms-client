import deepEqual from 'deep-equal';

export default (field) => {
  switch (field.type) {
    case 'Symbol':
      return 'string';
    case 'Text':
      return 'text';
    case 'Integer':
      return 'integer';
    case 'Number':
      return 'float';
    case 'Date':
      return 'date_time';
    case 'Location':
      return 'lat_lon';
    case 'Boolean':
      return 'boolean';
    case 'Object':
      return 'json';
    case 'Link':
      switch (field.linkType) {
        case 'Entry':
          return 'link';
        case 'Asset':
          for (const validation of field.validations) {
            if (
              validation.hasOwnProperty('linkMimetypeGroup')
            && deepEqual(validation.linkMimetypeGroup, ['image'])
            ) {
              return 'image';
            }

            if (validation.hasOwnProperty('assetImageDimensions')) {
              return 'image';
            }
          }
          return 'file';
        default:
          return 'string';
      }
    case 'Array':
      switch (field.items.linkType) {
        case 'Asset':
          for (const validation of field.items.validations) {
            if (
              validation.hasOwnProperty('linkMimetypeGroup')
            && deepEqual(validation.linkMimetypeGroup, ['image'])
            ) {
              return 'gallery';
            }

            if (validation.hasOwnProperty('assetImageDimensions')) {
              return 'gallery';
            }
          }
          return 'string';
        case 'Entry':
          return 'links';
        case 'Symbol':
          return 'string';
        default:
          return 'string';
      }
    default:
      return 'string';
  }
};
