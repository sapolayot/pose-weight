import { CoaApproveRecord } from "../types/coa-approve.type";

export default interface CoaApproveRepository {
  getList(): Promise<CoaApproveRecord[]>;
}
