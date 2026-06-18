import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Endpoint JWT tekshiruvisiz ochiq bo'ladi. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
