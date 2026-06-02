import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

/**
 * Validates that the decorated numeric property is not greater than the
 * sibling property named in `otherProperty`. Used so base_salary can never
 * exceed total_comp, which would otherwise poison the aggregate stats.
 */
export function IsNotGreaterThan(
  otherProperty: string,
  validationOptions?: ValidationOptions,
) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isNotGreaterThan',
      target: object.constructor,
      propertyName,
      constraints: [otherProperty],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const [other] = args.constraints as [string];
          const otherValue = (args.object as Record<string, unknown>)[other];
          if (typeof value !== 'number' || typeof otherValue !== 'number') {
            return true; // type checks handled by @IsNumber on each field
          }
          return value <= otherValue;
        },
        defaultMessage(args: ValidationArguments) {
          const [other] = args.constraints as [string];
          return `${args.property} must not be greater than ${other}`;
        },
      },
    });
  };
}
