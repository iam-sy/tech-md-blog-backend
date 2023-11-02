import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'posts' })
export class PostORM {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true, length: 255 })
  thumbnail: string;

  @Column({ length: 255 })
  title: string;

  @Column({ nullable: true, length: 255 })
  tag: string;

  @Column({ length: 255 })
  content: string;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
    onUpdate: 'CURRENT_TIMESTAMP(6)',
  })
  update: Date;

  @Column({ length: 15 })
  writer: string;

  openingPhrase: string;
}
