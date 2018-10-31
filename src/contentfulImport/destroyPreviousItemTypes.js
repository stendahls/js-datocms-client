import appClient from './appClient';
import { toItemApiKey } from './toApiKey';

export default async () => {
  const client = await appClient();
  const itemTypes = await client.dato.itemTypes.all();
  const rawContentTypes = await client.contentful.getContentTypes();
  const contentTypes = rawContentTypes.items;

  console.log('Cleaning previous item types on DatoCMS space');

  for (const contentType of contentTypes) {
    const itemTypeApiKey = toItemApiKey(contentType.sys.id);

    const itemType = itemTypes.find((element) => {
      return element.apiKey === itemTypeApiKey;
    });
    if (itemType) {
      const destroyedItemType = await client.dato.itemTypes.destroy(itemType.id);
      console.log('Destroyed', destroyedItemType.apiKey);
    }
  }
};
