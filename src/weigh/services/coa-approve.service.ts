import CoaApprove from "../models/coa-approve.model";
import CoaApproveSqlRepository from "../repositories/sql/coa-approve-sql.repository";
import { CoaApproveDto } from "../types/coa-approve.type";

export default class CoaApproveService {
  private repo = new CoaApproveSqlRepository();

  async getList(): Promise<CoaApproveDto[]> {
    const rows = await this.repo.getList();

    return rows.map((row) => new CoaApprove(row).toListDto());
  }
}
