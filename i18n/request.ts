import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async () => {
    return {
        locale: 'en',
        messages: (await import(`@/i18n/locales/en.json`)).default,
    };
});
