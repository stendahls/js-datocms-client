import appClient from './appClient';
import { toItemApiKey } from './toApiKey';

export default async () => {
  const client = await appClient();
  const itemTypes = await client.dato.itemTypes.all();
  const rawContentTypes = await client.contentful.getContentTypes();
  const contentTypes = rawContentTypes.items;

  for (const contentType of contentTypes) {
    const itemTypeApiKey = toItemApiKey(contentType.sys.id);

    const itemType = itemTypes.find((element) => {
      return element.apiKey === itemTypeApiKey;
    });
    if (itemType) {
      const destroyedItemType = await client.dato.itemTypes.destroy(itemType.id);
    }
  }
};
