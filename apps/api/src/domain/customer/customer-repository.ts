import type { Customer } from "@/domain/customer/customer";

export interface ICustomerRepository {
  findById(
    organizationId: string,
    customerId: string,
  ): Promise<Customer | null>;
  findByIds(organizationId: string, customerIds: string[]): Promise<Customer[]>;
  findByEmail(organizationId: string, email: string): Promise<Customer | null>;
  findAll(organizationId: string): Promise<Customer[]>;
  save(customer: Customer): Promise<void>;
}
