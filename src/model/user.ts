import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'user' })
export class UserORM {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 15 })
  user_id: string;

  @Column({ length: 15 })
  user_name: string;

  @Column({ length: 255 })
  user_password: string;

  @Column({ nullable: true, length: 255 })
  refresh: string;
}
