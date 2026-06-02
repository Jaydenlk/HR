import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly repo: Repository<User>) {}

  findById(id: string): Promise<User | null> {
    return this.repo.findOneBy({ id });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findOneBy({ email: email.trim().toLowerCase() });
  }

  async findOrCreate(email: string, name: string, invite_code: string): Promise<User> {
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();
    const existing = await this.findByEmail(normalizedEmail);
    if (existing) {
      if (existing.name !== trimmedName) {
        existing.name = trimmedName;
        return this.repo.save(existing);
      }
      return existing;
    }
    return this.repo.save(this.repo.create({ email: normalizedEmail, name: trimmedName, invite_code }));
  }
}
