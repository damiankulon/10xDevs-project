import { IsUUID } from 'class-validator';

/**
 * Path parameter DTO for package ID validation
 */
export class PackageIdParam {
  @IsUUID('4', { message: 'packageId must be a valid UUID' })
  packageId: string;
}
